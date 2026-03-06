import PdfSigner from "./components/PdfSigner";
import ErrorBoundary from "./components/ErrorBoundary";

export default function Home() {
  return (
    <ErrorBoundary>
      <PdfSigner />
    </ErrorBoundary>
  );
}
