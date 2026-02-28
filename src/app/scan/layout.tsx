/**
 * Scan layout — No Navbar, full-screen for mobile scanner experience.
 * This overrides the root layout's <Navbar /> + <main> wrapper.
 */
export default function ScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
