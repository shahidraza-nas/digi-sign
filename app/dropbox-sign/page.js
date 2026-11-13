import DropboxSignDemo from "../components/DropboxSignDemo";
import ErrorBoundary from "../components/ErrorBoundary";

export const metadata = {
  title: "Dropbox Sign Demo — DigiSign",
  description: "Sign a PDF with Dropbox Sign embedded signing (test mode)",
};

export default function DropboxSignPage() {
  return (
    <ErrorBoundary>
      <DropboxSignDemo />
    </ErrorBoundary>
  );
}
