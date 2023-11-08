// Docs say that this script needs to be injected before other things on the
// page, esp. before React is loaded.
const script = document.createElement("script");
script.src = "http://localhost:8097";
script.async = false;
document.documentElement.appendChild(script);
