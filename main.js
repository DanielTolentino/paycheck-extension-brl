function convertToRawCount(number) {
  const cleaned = number.replace(/[,./\s]/g, ""); // Remover vírgulas, pontos, barras e espaços
  const base = parseFloat(cleaned);

  if (number.toLowerCase().match(/(k|mil)/i)) {
    return Math.round(base * 1000);
  } else if (number.toLowerCase().match(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*mi\b/i)) {
    return Math.round(base * 1000000);
  } else if (number.toLowerCase().match(/b/i)) {
    return Math.round(base * 1000000000);
  } else {
    return base;
  }
}

function convertToBRL(number) {
  const rawCount = convertToRawCount(number);

  const processed = rawCount * 0.0000026;
  const exchangeRate = 5; // Replace with the actual exchange rate from USD to BRL

  const brlAmount = processed * exchangeRate;

  // Format the Brazilian Real amount with commas for thousands and two decimal places
  const formattedBRL = brlAmount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formattedBRL;
}

const globalSelectors = {};
globalSelectors.postCounts = `[role="group"][id*="id__"]:only-child`;
globalSelectors.articleDate = `[role="article"][aria-labelledby*="id__"][tabindex="-1"] time`;
globalSelectors.analyticsLink = " :not(.realBox)>a[href*='/analytics']";
globalSelectors.viewCount = globalSelectors.postCounts + globalSelectors.analyticsLink;

const innerSelectors = {};
innerSelectors.realSpot = "div div:first-child";
innerSelectors.viewSVG = "div div:first-child svg";
innerSelectors.viewAmount = "div div:last-child span span span";
innerSelectors.articleViewAmount = "span div:first-child span span span";

function doWork() {
  const viewCounts = Array.from(
    document.querySelectorAll(globalSelectors.viewCount)
  );

  const articleViewDateSection = document.querySelector(globalSelectors.articleDate);

  if(articleViewDateSection) {
    let rootDateViewsSection = articleViewDateSection.parentElement.parentElement.parentElement;

    if(rootDateViewsSection?.children.length === 1) {
      // we're dealing with the <time> element on a quote retweet
      // do globalSelector query again but with 2nd result
      rootDateViewsSection = document.querySelectorAll(globalSelectors.articleDate)[1].parentElement.parentElement.parentElement;
    }

    // if there are more than 4, we already added the paycheck value
    if(rootDateViewsSection?.children.length < 4) {

      // clone 2nd and 3rd child of rootDateViewsSection
      const clonedDateViewSeparator = rootDateViewsSection?.children[1].cloneNode(true);
      const clonedDateView = rootDateViewsSection?.children[2].cloneNode(true);

      // insert clonedDateViews and clonedDateViewsTwo after the 3rd child we just cloned
      rootDateViewsSection?.insertBefore(clonedDateViewSeparator, rootDateViewsSection?.children[2].nextSibling);
      rootDateViewsSection?.insertBefore(clonedDateView, rootDateViewsSection?.children[3].nextSibling);

      // get view count value from 'clonedDateViewsTwo'
      const viewCountValue = clonedDateView?.querySelector(innerSelectors.articleViewAmount)?.textContent;
      const realAmount = convertToBRL(viewCountValue);

      // replace textContent in cloned clonedDateViews (now 4th child) with converted view count value
      clonedDateView.querySelector(innerSelectors.articleViewAmount).textContent = "" + realAmount;

      // remove 'views' label
      clonedDateView.querySelector(`span`).children[1].remove()
    }
  }

  for (const view of viewCounts) {
    // only add the real box once
    if (!view.classList.contains("replaced")) {
      // make sure we don't touch this one again
      view.classList.add("replaced");

      // get parent and clone to make realBox
      const parent = view.parentElement;
      const realBox = parent.cloneNode(true);
      realBox.classList.add("realBox");

      // insert realBox after view count
      parent.parentElement.insertBefore(realBox, parent.nextSibling);

     // remove view count icon
      const oldIcon = realBox.querySelector(innerSelectors.viewSVG);
      oldIcon?.remove();

      // swap the svg for a real sign
      const realSpot = realBox.querySelector(innerSelectors.realSpot)?.firstChild?.firstChild;
      realSpot.textContent = "";

      // magic alignment value
      realSpot.style.marginTop = "-0.6rem";
    }

    // get the number of views and calculate & set the real amount
    const realBox = view.parentElement.nextSibling.firstChild;
    const viewCount = view.querySelector(innerSelectors.viewAmount)?.textContent;
    if (viewCount == undefined) continue;
    const realAmountArea = realBox.querySelector(innerSelectors.viewAmount);
    realAmountArea.textContent = convertToBRL(viewCount);
  }
}

function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function () {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

// Function to start MutationObserver
const observe = () => {
  const observer = new MutationObserver((mutationsList) => {
    if (!mutationsList.length) return;

    const runDocumentMutations = throttle(async () => {
      requestAnimationFrame(doWork);
    }, 1000);

    runDocumentMutations();
  });

  observer.observe(document, {
    childList: true,
    subtree: true,
  });
};

observe();
