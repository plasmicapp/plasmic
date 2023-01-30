import { PlatformType, platformTypeToString } from "../utils/types";

export function README(platform: PlatformType, buildCommand: string): string {
  return `This is a ${platformTypeToString(
    platform
  )} project bootstrapped with [\`create-plasmic-app\`](https://www.npmjs.com/package/create-plasmic-app).

## Getting Started

First, run the development server:

\`\`\`bash
${buildCommand}
\`\`\`

Open your browser to see the result.

You can start editing your project in Plasmic Studio. The page auto-updates as you edit the project.

## Learn More

With Plasmic, you can enable non-developers on your team to publish pages and content into your website or app.

To learn more about Plasmic, take a look at the following resources:

- [Plasmic Website](https://www.plasmic.app/)
- [Plasmic Documentation](https://docs.plasmic.app/learn/)
- [Plasmic Slack Community](https://www.plasmic.app/slack)

You can check out [the Plasmic GitHub repository](https://github.com/plasmicapp/plasmic) - your feedback and contributions are welcome!
`;
}
