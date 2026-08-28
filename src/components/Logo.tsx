export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <img
      className={dark ? "logo-image logo-image-dark" : "logo-image"}
      src="/blackbird-logo.png"
      alt="Klown"
    />
  );
}
