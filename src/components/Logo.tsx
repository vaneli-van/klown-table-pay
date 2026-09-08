export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <img
      className={dark ? "logo-image logo-image-dark" : "logo-image"}
      src="/klown-logo.png"
      alt="Klown"
    />
  );
}
