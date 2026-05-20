import FloatingTaskbar from "./FloatingTaskbar";

export default function SimpleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FloatingTaskbar />
    </>
  );
}
