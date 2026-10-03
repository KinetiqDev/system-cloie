// Keep the fixed rail width and the page gutter synchronized. Layout reflows
// during the fold; reduced motion disables it. Tailwind needs literal classes.
export const FOLD_MOTION =
  "transition-[width,padding-left] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";
