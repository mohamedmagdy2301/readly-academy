/** localStorage keys used across the site. Keep them stable: changing a key resets user progress. */
export const KEYS = {
  tasks: "cag-tasks",
  done: "cag-lesson-done",
  quiz: "cag-quiz",
  log: "cag-log",
  theme: "cag-theme",
  last: "cag-last-visited",
} as const;

/** Runs before paint (inlined in <head>) so theme and reading mode don't flash. */
export const themeScript = `try{var t=JSON.parse(localStorage.getItem("${KEYS.theme}")||"null");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
