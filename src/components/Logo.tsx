// Same mark as src/app/icon.svg (the favicon), but follows the theme's accent color.
export default function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M7 24.5h5.5V19H18v-5.5h5.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23.5" cy="8" r="2.5" fill="#fff" />
    </svg>
  );
}
