import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";
const workerSource = `
const {parentPort,workerData}=require('node:worker_threads');
const {PDFDocument,PDFDict,PDFArray,PDFName,PDFStream}=require(workerData.library);
(async()=>{try{
 const doc=await PDFDocument.load(workerData.bytes,{ignoreEncryption:false,throwOnInvalidObject:true,updateMetadata:false});
 if(doc.isEncrypted||doc.getPageCount()<1||doc.getPageCount()>100)throw Error();
 const objects=doc.context.enumerateIndirectObjects();if(objects.length>20000)throw Error();
 const forbidden=new Set(['JavaScript','JS','OpenAction','AA','Launch','EmbeddedFiles','EF','XFA','AcroForm','RichMedia','Collection','SubmitForm','ImportData','GoToR','GoToE','Rendition','RichMediaExecute','Sound','Movie']);
 const seen=new Set();let count=0;
 function visit(object,depth=0){if(!object||seen.has(object))return;if(++count>100000||depth>50)throw Error();seen.add(object);
  if(object instanceof PDFStream){visit(object.dict,depth+1);return;}
  if(object instanceof PDFDict){for(const[key,value]of object.entries()){const name=key.decodeText();if(forbidden.has(name))throw Error();if(name==='S'&&value instanceof PDFName&&forbidden.has(value.decodeText()))throw Error();if(name==='URI'){const url=new URL(value.decodeText());if(!['https:','http:','mailto:'].includes(url.protocol)||url.username||url.password)throw Error();}visit(value,depth+1);}}
  else if(object instanceof PDFArray){for(const value of object.asArray())visit(value,depth+1);}
 }
 for(const[,object]of objects)visit(object);
 parentPort.postMessage({ok:true,pages:doc.getPageCount(),synthetic:doc.getSubject()==='mystra-careers-synthetic'});
}catch{parentPort.postMessage({ok:false});}})();`;
const workerBudget = globalThis as unknown as { mystraResumeWorkers?: number };
export async function validateResume(bytes: Buffer, name: string, mime: string, maxBytes: number) {
  if (!/\.pdf$/i.test(name) || mime !== "application/pdf" || !bytes.length || bytes.length > maxBytes || !/^%PDF-(1\.[0-7]|2\.0)/.test(bytes.subarray(0, 9).toString("ascii")) || !/%%EOF\s*$/.test(bytes.subarray(-2048).toString("latin1"))) throw new Error("INVALID_PDF");
  const library = createRequire(`${process.cwd()}/package.json`).resolve("pdf-lib");
  if ((workerBudget.mystraResumeWorkers || 0) >= 2) throw new Error("PDF_VALIDATOR_BUSY");
  workerBudget.mystraResumeWorkers = (workerBudget.mystraResumeWorkers || 0) + 1;
  try { return await new Promise<{ pages: number; synthetic: boolean }>((resolve, reject) => {
    const worker = new Worker(workerSource, { eval: true, workerData: { bytes: new Uint8Array(bytes), library }, resourceLimits: { maxOldGenerationSizeMb: 96, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 } });
    let completed = false;
    const finish = (result?: { ok: boolean; pages: number; synthetic: boolean }) => { if (completed) return; completed = true; clearTimeout(timer); void worker.terminate(); if (result?.ok) resolve({ pages: result.pages, synthetic: result.synthetic }); else reject(new Error("INVALID_PDF")); };
    const timer = setTimeout(() => finish(), 5000);
    worker.once("message", finish); worker.once("error", () => finish()); worker.once("exit", () => finish());
  }); } finally { workerBudget.mystraResumeWorkers = Math.max(0, (workerBudget.mystraResumeWorkers || 1) - 1); }
}
