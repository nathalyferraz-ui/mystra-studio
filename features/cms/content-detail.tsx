import type { ContentRecord } from "./queries";
import type { CmsModule } from "./config";
import { ServiceDetail } from "@/features/services/service-detail";
import { ArticleDetail } from "@/features/insights/article-detail";
import { ProjectDetail } from "@/features/portfolio/project-detail";
export function ContentDetail({ item, section, preview = false }: { item: ContentRecord; section: CmsModule; preview?: boolean }) {
  if (section === "servicos") return <ServiceDetail item={item} preview={preview} />;
  if (section === "portfolio") return <ProjectDetail item={item} preview={preview} />;
  return <ArticleDetail item={item} preview={preview} />;
}
