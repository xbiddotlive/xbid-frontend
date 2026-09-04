import Link from "next/link";
import { I18nText } from "@/lib/i18n/locale-context";

export default function NotFound() {
  return (
    <main className="pageShell utilityPage">
      <div className="emptyState errorState">
        <strong><I18nText id="error.notFound.title" /></strong>
        <span><I18nText id="error.notFound.description" /></span>
        <Link className="button buttonPrimary" href="/"><I18nText id="error.back" /></Link>
      </div>
    </main>
  );
}
