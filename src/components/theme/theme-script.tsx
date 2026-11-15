/**
 * Applies the saved theme before the first paint (no flash of the wrong theme).
 * Rendered in <head> by the root layout.
 */
const SCRIPT = `(function(){try{var t=localStorage.getItem("cp-theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
