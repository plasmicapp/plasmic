import { PlasmicComponent } from "@plasmicapp/loader-nextjs";

const ipUrl = "https://worldtimeapi.org/api/ip";
const timezoneUrl = "https://worldtimeapi.org/api/timezone";

export async function ContentServerComponent() {
  // 1. Fetch timezone from IP
  const ipResp = await fetch(ipUrl);
  const ipData = await ipResp.json();
  const timezone = ipData["timezone"];

  // 2. Fetch time from timezone
  const timeResp = await fetch(`${timezoneUrl}/${timezone}`);
  const timeData = await timeResp.json();
  const time = timeData["datetime"];

  return (
    <>
      <PlasmicComponent
        component="Card"
        componentProps={{
          title: "Write your own code",
          children: "This page was built like any other page in Next.js.",
        }}
      />
      <PlasmicComponent
        component="Card"
        componentProps={{
          title: "Use Plasmic components",
          children:
            "This page references components built in Plasmic Studio, so designs are always in sync.",
        }}
      />
      <PlasmicComponent
        component="Card"
        componentProps={{
          title: "Fetch data dynamically",
          children: (
            <span>
              For example, your timezone ({timezone}) and local time ({time})
              were fetched server-side from https://worldtimeapi.org/ based on
              your IP.
            </span>
          ),
        }}
      />
      <PlasmicComponent component="Card: SSR" />
      <PlasmicComponent component="Card: SSG" />
      <PlasmicComponent
        component="Card"
        componentProps={{
          title: "Incremental static regeneration (ISR)",
          children:
            "On a production build, this page (including the dynamic data) will be regenerated every 10 seconds.",
        }}
      />
    </>
  );
}
