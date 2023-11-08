A fork of http://wickynilliams.github.com/enquire.js/ that works with SSR.

If we import from "enquire.js" directly it exports `new MediaQueryDispatch()` which crashes if running on a server.
This is just to export undefined if it's not running on the browser.