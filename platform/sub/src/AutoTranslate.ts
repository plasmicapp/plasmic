declare let google;

export function startTranslating(fromLang = "la", toLang: string) {
  const toolbarLang = "en";

  const uid = "1E07F158C6FA4460B352973E9693B329";
  const teId = "TE_" + uid;
  const cbId = "TECB_" + uid;

  function show() {
    window.setTimeout(function () {
      window[teId].showBanner(true);
    }, 10);
  }

  function newElem() {
    var elem = new google.translate.TranslateElement({
      autoDisplay: false,
      floatPosition: 0,
      multilanguagePage: true,
      pageLanguage: fromLang,
      includedLanguages: toLang,
    });
    return elem;
  }

  if (window[teId]) {
    show();
  } else {
    if (
      !(window as any).google ||
      !google.translate ||
      !google.translate.TranslateElement
    ) {
      if (!window[cbId]) {
        window[cbId] = function () {
          window[teId] = newElem();
          show();
        };
      }
      var s = document.createElement("script");
      s.src =
        "https://translate.google.com/translate_a/element.js?cb=" +
        encodeURIComponent(cbId) +
        "&client=tee&hl=" +
        toolbarLang;
      document.getElementsByTagName("head")[0].appendChild(s);
    }
  }
}

export function stopTranslating() {
  const frame = document.querySelector(
    ".goog-te-banner-frame"
  ) as HTMLIFrameElement;
  const btn = frame.contentDocument.querySelector(
    ".goog-close-link"
  ) as HTMLElement;
  btn.click();
}
