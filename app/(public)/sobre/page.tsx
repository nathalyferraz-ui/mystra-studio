import { AboutPage } from "@/features/about/about-page";
import { institutionalMetadata } from "@/features/institutional/metadata";
export async function generateMetadata() { return institutionalMetadata("sobre"); }
export default AboutPage;
