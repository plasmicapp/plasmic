export const PLASMIC_LOGO = `function PlasmicLogo() {
  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M34 26h-2v-1c0-6.627-5.373-12-12-12S8 18.374 8 25v1H6a1 1 0 01-1-1c0-8.284 6.716-15 15-15 8.284 0 15 6.716 15 15a1 1 0 01-1 1z"
        fill="url(#paint0_linear)"
      />
      <path
        d="M27 25a7 7 0 00-14 0v1h2a1 1 0 001-1 4 4 0 018 0 1 1 0 001 1h2v-1z"
        fill="url(#paint1_linear)"
      />
      <path
        d="M30.999 25C30.999 18.925 26.075 14 20 14S9.001 18.926 9.001 25H9v1h3v-1a8 8 0 0116 0v1h3v-1h-.001z"
        fill="url(#paint2_linear)"
      />
      <defs>
        <linearGradient
          id="paint0_linear"
          x1={5}
          y1={26}
          x2={35}
          y2={26}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1877F2" />
          <stop offset={1} stopColor="#04A4F4" />
        </linearGradient>
        <linearGradient
          id="paint1_linear"
          x1={13}
          y1={26}
          x2={27}
          y2={26}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F02849" />
          <stop offset={1} stopColor="#F5533D" />
        </linearGradient>
        <linearGradient
          id="paint2_linear"
          x1={9}
          y1={26}
          x2={31}
          y2={26}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#45BD62" />
          <stop offset={1} stopColor="#2ABBA7" />
        </linearGradient>
      </defs>
    </svg>
  );
}
`;

export function WELCOME_PAGE(
  hasPages: boolean,
  platform: string,
  pageSection: string
): string {
  return `import React from "react";
${hasPages && platform === "nextjs" ? `import Link from "next/link";` : ""}
${PLASMIC_LOGO}

function Index() {
  return (
    <div style={{ width: "100%", padding: "100px", alignContent: "center" }}>
      <header>
        <PlasmicLogo />
        <h1 style={{ margin: 0 }}>
          Welcome to Plasmic!
        </h1>
        <h4>
          <a
            style={{ color: "blue" }}
            href="https://www.plasmic.app/learn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn Plasmic
          </a>
        </h4>
        ${pageSection}
        <p><i>Note: Remember to remove this file if you introduce a Page component at the &#39;/&#39; path.</i></p>
      </header>
    </div>
  );
}

export default Index;
`;
}
