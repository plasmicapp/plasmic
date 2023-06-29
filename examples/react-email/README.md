# Plasmic + react-email demo!

This is a demo of using Plasmic with react-email.

Plasmic project: https://studio.plasmic.app/projects/sXtbscNmYYd622LCGixggx

We make a Next.js API route at pages/api/email.tsx to render an email template designed in Plasmic.
The endpoint takes a template name as a query param, and responds with the HTML.
So you can visit for example:

http://localhost:3000/api/email?template=Basic

You can take the resulting HTML response and send it, or cache it if it's a commonly sent (and non-personalized) email.
You can also update the API endpoint to directly send the response.

We also register some react-email code components in plasmic-init.ts.
react-email provides components ensured to work with major email clients, which have notoriously fickle support for arbitrary HTML/CSS.
Avoid using the free-form HTML elements that Plasmic comes with.
So Plasmic's content creator mode (component only mode) is important!

BUT: you'll want to enable CSS styling in Plasmic Studio (in the Plasmic workspace, you'll find a setting to enable certain style sections).
Some components will require you specify padding via pX and pY props, but most other non-layout CSS should work.
(You can leave the layout styling section disabled for content creators.)

You will likely want to register some higher level components to use, since the base react-email components are very minimal and will require a lot of style configuration (via `style` props) to work.

So the only files you have to pay attention to really are pages/api/email.tsx for the rendering, and plasmic-init.ts for the component registrations.

We just so happen to use Next.js for this demo, but that's not important at all, since all we're doing is implementing an API route.
This could just be a simple Node script, or an Express route handler, or anything else.
Besides the code to render emails, we also just need some way to serve as a [Plasmic Studio app host][app host],
so that the react-email-based code components are registered for Plasmic Studio users to drag and drop and build into emails.

[app host]: https://docs.plasmic.app/learn/app-hosting