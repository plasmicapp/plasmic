import { expect, Page } from "@playwright/test";
import { getEnvVar, LOADER_NEXTJS_VERSIONS } from "../../env";
import { test } from "../../fixtures";
import {
  NextJsContext,
  setupNextJs,
  teardownNextJs,
} from "../../nextjs/nextjs-setup";

const loadingSelector = "text=loading preview custom...";
const noPreviewSelector = "text=No preview custom...";

async function assertNoPreview(page: Page, loading = false) {
  await expect(page.locator("#hostname-text")).toBeHidden();
  await expect(page.locator("#title-text")).toBeHidden();
  await expect(page.locator("#description-text")).toBeHidden();
  await expect(page.locator("#site-name-text")).toBeHidden();
  await expect(page.locator("#preview-image")).toBeHidden();

  if (loading) {
    await expect(page.locator(loadingSelector)).toBeVisible();
    await expect(page.locator(noPreviewSelector)).toBeHidden();
  } else {
    await expect(page.locator(loadingSelector)).toBeHidden();
  }
}

test.describe(`Plasmic Link Preview`, async () => {
  for (const versions of LOADER_NEXTJS_VERSIONS) {
    const { loaderVersion, nextVersion } = versions;

    test.describe(`loader-nextjs@${loaderVersion}, next@${nextVersion}`, async () => {
      let ctx: NextJsContext;
      test.beforeEach(async () => {
        ctx = await setupNextJs({
          bundleFile: "plasmic-link-preview.json",
          projectName: "Plasmic Link Preview",
          npmRegistry: getEnvVar("NPM_CONFIG_REGISTRY"),
          codegenHost: getEnvVar("WAB_HOST"),
          removeComponentsPage: true,
          loaderVersion,
          nextVersion,
        });
      });

      test.afterEach(async () => {
        await teardownNextJs(ctx);
      });

      test(`it works`, async ({ page }) => {
        const mockedTitle = "The mocked GitHub: Let’s build from here";
        const mockedDescription =
          "Mocked GitHub is where over 100 million developers blah blah shape the blah future of software, together. Mock Contribute to the open source community, manage your Git repositories, review code like a pro, track bugs and fea...";
        const mockedSitename = "GitHub (Mocked)";
        const mockedImage =
          "https://mocked-github.githubassets.com/assets/mocked/hero-mobile-7163f4f5de41.webp";
        await page.route(
          "https://corsproxy.io/?https://github.com",
          async (route) => {
            const customResponse = {
              status: 200,
              contentType: "text/html",
              body: `
                <!DOCTYPE html>
                <html lang="en" data-a11y-animated-images="system" data-a11y-link-underlines="true">
                    <head>
                         <title>GitHub: hahahh Let’s build from here ·SARAH GitHub</title>
                        <meta name="page-subject" content="GitHub">
                        <meta name="description" content="3 GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code like a pro, track bugs and features, power your CI/CD and DevOps workflows, and secure code before you commit it.">
                        <meta property="fb:app_id" content="1401488693436528">
                        <meta name="apple-itunes-app" content="app-id=1477376905, app-argument=https://github.com/"/>
                        <meta name="twitter:image:src" content="https://github.githubassets.com/assets/campaign-social-f8ee94bbef53.png"/>
                        <meta name="twitter:site" content="@github"/>
                        <meta name="twitter:card" content="summary_large_image"/>
                        <meta name="twitter:title" content="GitHub: dsgds Let’s build from here"/>
                        <meta name="twitter:description" content="1 GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code like a pro, track bugs and fea..."/>
                        <meta property="og:image" content="${mockedImage}"/>
                        <meta property="og:image:alt" content="2 GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code like a pro, track bugs and fea..."/>
                        <meta property="og:site_name" content="${mockedSitename}"/>
                        <meta property="og:type" content="object"/>
                        <meta property="og:title" content="${mockedTitle}"/>
                        <meta property="og:url" content="https://github.com/"/>
                        <meta property="og:description" content="${mockedDescription}"/>
                        <meta name="hostname" content="github.com">
                        <meta name="expected-hostname" content="github.com">
                        <meta property="og:image:type" content="image/png">
                        <meta property="og:image:width" content="1200">
                        <meta property="og:image:height" content="630">
                    </head>
                    <body class="logged-out env-production page-responsive header-overlay home-campaign" style="word-wrap: break-word;">
                        <div data-turbo-body class="logged-out env-production page-responsive header-overlay home-campaign" style="word-wrap: break-word;">
                            <div class="container-xl position-relative">
                                <img alt="" aria-hidden="true" width="2236" height="1630" class="position-absolute top-0 height-auto events-none d-none d-sm-block" style="width: min(1118px, max(100vh, 100vw)); left: 67%;" src="${mockedImage}"/>
                                <img alt="" aria-hidden="true" width="860" height="544" class="events-none d-sm-none width-full height-auto mb-n3" src="https://github.githubassets.com/assets/campaign-social-f8ee94bbef53.png"/>
                            </div>
                        </div>
                    </body>
                </html>
                `,
            };
            setTimeout(async () => {
              await route.fulfill(customResponse);
            }, 2000);
          }
        );

        await page.goto(`${ctx.host}/link-preview-test`);

        await page.waitForTimeout(1000);

        // assertNoPreview(page, true);

        await page.waitForTimeout(2000);

        await expect(page.locator(loadingSelector)).toBeHidden();
        await expect(page.locator(noPreviewSelector)).toBeHidden();

        await expect(page.locator("#hostname-text")).toHaveText("github.com");
        await expect(page.locator("#title-text")).toHaveText(mockedTitle);
        await expect(page.locator("#description-text")).toHaveText(
          mockedDescription
        );
        await expect(page.locator("#site-name-text")).toHaveText(
          mockedSitename
        );
        expect(await page.locator("#preview-image").getAttribute("src")).toBe(
          mockedImage
        );
      });
      test(`no preview`, async ({ page }) => {
        await page.route(
          "https://corsproxy.io/?https://github.com",
          async (route) => {
            const customResponse = {
              status: 400,
              contentType: "text/html",
              body: `
              <!DOCTYPE html>
              <!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="en-US"> <![endif]-->
              <!--[if IE 7]>    <html class="no-js ie7 oldie" lang="en-US"> <![endif]-->
              <!--[if IE 8]>    <html class="no-js ie8 oldie" lang="en-US"> <![endif]-->
              <!--[if gt IE 8]><!--> <html class="no-js" lang="en-US"> <!--<![endif]-->
              <head>
              <title>Origin DNS error | slack.edu | Cloudflare</title>
              <meta charset="UTF-8" />
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
              <meta http-equiv="X-UA-Compatible" content="IE=Edge" />
              <meta name="robots" content="noindex, nofollow" />
              <meta name="viewport" content="width=device-width,initial-scale=1" />
              <link rel="stylesheet" id="cf_styles-css" href="/cdn-cgi/styles/main.css" />


              <script>
              (function(){if(document.addEventListener&&window.XMLHttpRequest&&JSON&&JSON.stringify){var e=function(a){var c=document.getElementById("error-feedback-survey"),d=document.getElementById("error-feedback-success"),b=new XMLHttpRequest;a={event:"feedback clicked",properties:{errorCode:1016,helpful:a,version:1}};b.open("POST","https://sparrow.cloudflare.com/api/v1/event");b.setRequestHeader("Content-Type","application/json");b.setRequestHeader("Sparrow-Source-Key","c771f0e4b54944bebf4261d44bd79a1e");
              b.send(JSON.stringify(a));c.classList.add("feedback-hidden");d.classList.remove("feedback-hidden")};document.addEventListener("DOMContentLoaded",function(){var a=document.getElementById("error-feedback"),c=document.getElementById("feedback-button-yes"),d=document.getElementById("feedback-button-no");"classList"in a&&(a.classList.remove("feedback-hidden"),c.addEventListener("click",function(){e(!0)}),d.addEventListener("click",function(){e(!1)}))})}})();
              </script>

              <script defer src="https://performance.radar.cloudflare.com/beacon.js"></script>
              </head>
              <body>
                <div id="cf-wrapper">
                  <div class="cf-alert cf-alert-error cf-cookie-error hidden" id="cookie-alert" data-translate="enable_cookies">Please enable cookies.</div>
                  <div id="cf-error-details" class="p-0">
                    <header class="mx-auto pt-10 lg:pt-6 lg:px-8 w-240 lg:w-full mb-15 antialiased">
                       <h1 class="inline-block md:block mr-2 md:mb-2 font-light text-60 md:text-3xl text-black-dark leading-tight">
                         <span data-translate="error">Error</span>
                         <span>1016</span>
                       </h1>
                       <span class="inline-block md:block heading-ray-id font-mono text-15 lg:text-sm lg:leading-relaxed">Ray ID: 8268e897e6cc0787 &bull;</span>
                       <span class="inline-block md:block heading-ray-id font-mono text-15 lg:text-sm lg:leading-relaxed">2023-11-15 16:35:38 UTC</span>
                      <h2 class="text-gray-600 leading-1.3 text-3xl lg:text-2xl font-light">Origin DNS error</h2>
                    </header>

                    <section class="w-240 lg:w-full mx-auto mb-8 lg:px-8">
                        <div id="what-happened-section" class="w-1/2 md:w-full">
                          <h2 class="text-3xl leading-tight font-normal mb-4 text-black-dark antialiased" data-translate="what_happened">What happened?</h2>
                          <p>You've requested a page on a website (slack.edu) that is on the <a href="https://www.cloudflare.com/5xx-error-landing/" target="_blank">Cloudflare</a> network. Cloudflare is currently unable to resolve your requested domain (slack.edu).

                        </div>


                        <div id="resolution-copy-section" class="w-1/2 mt-6 text-15 leading-normal">
                          <h2 class="text-3xl leading-tight font-normal mb-4 text-black-dark antialiased" data-translate="what_can_i_do">What can I do?</h2>
                          <p><strong>If you are a visitor of this website:</strong><br />Please try again in a few minutes.</p><p><strong>If you are the owner of this website:</strong><br />Check your DNS settings. If you are using a CNAME origin record, make sure it is valid and resolvable. <a rel="noopener noreferrer" href="https://support.cloudflare.com/hc/en-us/articles/234979888-Error-1016-Origin-DNS-error">Additional troubleshooting information here.</a></p>
                        </div>

                    </section>

                    <div class="feedback-hidden py-8 text-center" id="error-feedback">
                  <div id="error-feedback-survey" class="footer-line-wrapper">
                      Was this page helpful?
                      <button class="border border-solid bg-white cf-button cursor-pointer ml-4 px-4 py-2 rounded" id="feedback-button-yes" type="button">Yes</button>
                      <button class="border border-solid bg-white cf-button cursor-pointer ml-4 px-4 py-2 rounded" id="feedback-button-no" type="button">No</button>
                  </div>
                  <div class="feedback-success feedback-hidden" id="error-feedback-success">
                      Thank you for your feedback!
                  </div>
              </div>
              </html>
                `,
            };
            setTimeout(async () => {
              await route.fulfill(customResponse);
            }, 2000);
          }
        );

        await page.goto(`${ctx.host}/link-preview-test`);

        await page.waitForTimeout(1000);

        // assertNoPreview(page, true);

        await page.waitForTimeout(2000);

        // assertNoPreview(page);
        await expect(page.locator(noPreviewSelector)).toBeVisible();
      });
    });
  }
});
