import { Request, Response } from "express-serve-static-core";

export async function getFakeTweets(req: Request, res: Response) {
  res.header("Access-Control-Allow-Origin", "*");

  res.json([
    {
      id: "5cd4bf2798704442ac8ff098",
      createdAt: "Wed Aug 04 1971 12:23:04 GMT+0000 (UTC)",
      body:
        "Officia consectetur aliquip esse ad dolor duis magna enim Lorem aute irure. Nostrud nulla ad in aute. Irure esse in sint ut. In ipsum sit labore reprehenderit nulla. Aliquip deserunt nisi irure ullamco voluptate aliqua ad aliquip id ex labore cupidatat Lorem. Ut ex nulla cupidatat commodo id dolore labore.",
      user: {
        id: "5cd4bf27e85904ed885b430f",
        picture: "https://randomuser.me/portraits/women/0.jpg",
        name: { first: "Park", last: "Emerson" },
        username: "park",
        about:
          "Nisi eu mollit fugiat nulla consequat id tempor aute velit laborum. Ea aliqua ad esse ut minim labore sunt voluptate officia Lorem quis laboris ad. Nisi consectetur dolore proident enim amet consequat esse aliquip laboris sunt veniam pariatur. Excepteur exercitation culpa est ipsum dolor est cillum culpa.",
        latitude: "-89.852884",
        longitude: "141.922886",
      },
    },
    {
      id: "5cd4bf2735c9c34ec1685864",
      createdAt: "Sat Jun 10 2006 17:34:55 GMT+0000 (UTC)",
      body:
        "Aliquip voluptate ex incididunt officia minim. Mollit reprehenderit commodo duis ea consectetur aliqua proident laborum eiusmod tempor. Adipisicing exercitation sit tempor eu magna minim pariatur quis deserunt nulla consequat nisi ullamco.",
      user: {
        id: "5cd4bf2760bfc30c9a3bd25c",
        picture: "https://randomuser.me/portraits/women/1.jpg",
        name: { first: "Stanley", last: "Simon" },
        username: "stanley",
        about:
          "Est minim laboris laborum consequat non mollit adipisicing aute quis excepteur et irure. Minim sit ullamco aliqua minim quis dolore. Adipisicing excepteur cillum sit ea dolor quis commodo occaecat. Consequat labore proident do in exercitation sit officia sunt deserunt. Laborum officia incididunt Lorem fugiat pariatur incididunt id nostrud. Nisi aliqua tempor in cupidatat consequat culpa est sunt amet.",
        latitude: "-5.643507",
        longitude: "41.673624",
      },
    },
    {
      id: "5cd4bf27230c6b19fc36d1f3",
      createdAt: "Fri Oct 19 2007 13:08:47 GMT+0000 (UTC)",
      body:
        "Lorem ullamco proident occaecat eu culpa laboris exercitation in duis nostrud ad. Cupidatat pariatur enim id magna eu irure nulla quis sit irure elit Lorem qui. Anim in nostrud voluptate reprehenderit veniam amet labore dolore elit nulla incididunt id. Ullamco ullamco eu laborum enim deserunt elit. Sunt amet id ut fugiat cupidatat eiusmod aute aliqua do eiusmod pariatur qui. Fugiat ullamco ipsum ex sint nostrud amet eu est eiusmod nostrud.",
      user: {
        id: "5cd4bf2787ca19107525c494",
        picture: "https://randomuser.me/portraits/women/2.jpg",
        name: { first: "Lara", last: "Jensen" },
        username: "lara",
        about:
          "Nulla adipisicing sunt aliqua veniam aute id. Id ea nulla Lorem ullamco nisi non anim adipisicing. Anim magna eiusmod nulla aliquip voluptate magna sit commodo enim aliquip sint amet qui minim. Sunt et consectetur ad qui incididunt duis. Non ipsum ex proident enim non laboris est aute esse et id cillum. Dolore commodo esse exercitation mollit fugiat excepteur ipsum deserunt ut id consequat commodo. Est anim velit laborum deserunt deserunt minim laboris ad id cupidatat velit.",
        latitude: "38.560532",
        longitude: "67.614951",
      },
    },
    {
      id: "5cd4bf27a49f31cefe2b6146",
      createdAt: "Wed Nov 05 1997 23:16:26 GMT+0000 (UTC)",
      body:
        "Labore sint enim culpa amet ullamco non Lorem amet cillum duis. Ipsum ullamco laboris ipsum cillum consequat quis. Adipisicing magna aute est cupidatat labore proident irure eu. Quis voluptate et labore non fugiat est aliquip dolor. Ea dolor quis amet officia occaecat sit mollit quis officia minim. Lorem consequat dolore consequat deserunt voluptate adipisicing fugiat eu mollit ex Lorem do.",
      user: {
        id: "5cd4bf27b7b50b4c05e22bb0",
        picture: "https://randomuser.me/portraits/women/3.jpg",
        name: { first: "Francis", last: "Marks" },
        username: "francis",
        about:
          "Veniam ipsum esse tempor velit. Exercitation Lorem minim sint et deserunt dolor nostrud adipisicing esse nostrud tempor labore. Consectetur do proident in do sit sint aliqua elit nulla laborum sit occaecat. Sit occaecat sunt laborum ut labore reprehenderit sint consequat culpa non fugiat et quis. Consequat ad cillum aliquip cillum officia.",
        latitude: "-20.106831",
        longitude: "-156.45508",
      },
    },
    {
      id: "5cd4bf27f183dff76290a858",
      createdAt: "Sat Jan 24 1981 00:39:42 GMT+0000 (UTC)",
      body:
        "Sint dolore laboris minim fugiat cillum id voluptate officia aliquip. Irure dolor et tempor consectetur ex laboris. Pariatur ad ipsum officia cupidatat id magna consectetur esse dolor cupidatat Lorem nulla in duis. Aliquip ea est magna adipisicing do. Sunt enim ad reprehenderit et cillum dolore. Commodo reprehenderit ea anim exercitation sint mollit quis. Ullamco commodo magna ut labore consectetur adipisicing culpa nulla irure elit nisi.",
      user: {
        id: "5cd4bf27cb55079637a65688",
        picture: "https://randomuser.me/portraits/women/4.jpg",
        name: { first: "Fox", last: "Green" },
        username: "fox",
        about:
          "Eiusmod anim exercitation ipsum ea esse eiusmod elit sit ad voluptate elit cupidatat. Est nostrud incididunt ea quis. Do qui cupidatat ex veniam nulla reprehenderit cillum consectetur deserunt ex ut ullamco magna. Mollit duis ex ex id eiusmod ullamco est deserunt officia. Exercitation voluptate qui enim ex veniam dolor officia qui laboris officia. Ut sit velit nulla consequat aliqua id sint irure occaecat. Nulla qui ex culpa et ex ipsum esse excepteur in incididunt amet sit excepteur.",
        latitude: "60.407198",
        longitude: "176.31973",
      },
    },
    {
      id: "5cd4bf2796a0c42fc36d098e",
      createdAt: "Sun Jul 06 1980 00:48:51 GMT+0000 (UTC)",
      body:
        "Enim dolor et nostrud quis sunt. Anim sint ad ipsum eu voluptate esse ea quis culpa aliquip id ut. Cillum cillum veniam ea incididunt culpa mollit cupidatat commodo culpa non amet incididunt sunt enim. Laborum laboris nisi id aliquip aute deserunt ipsum excepteur occaecat veniam incididunt cupidatat commodo in. Pariatur amet incididunt quis anim excepteur quis qui proident do. Velit cillum deserunt dolore cupidatat mollit aliqua ea sint reprehenderit id sunt proident Lorem. Occaecat officia laborum exercitation id consequat aute enim aliquip culpa proident duis.",
      user: {
        id: "5cd4bf27a30b27dbf30c1078",
        picture: "https://randomuser.me/portraits/women/5.jpg",
        name: { first: "Helga", last: "Short" },
        username: "helga",
        about:
          "Ut consequat aliqua ea fugiat eu ipsum commodo fugiat pariatur. Veniam proident pariatur voluptate irure id nulla reprehenderit occaecat incididunt. Non voluptate ex dolore irure non nostrud amet culpa. Anim nisi nostrud tempor mollit nulla duis ex. Et labore aute sint eu pariatur ex qui sit qui sunt consequat.",
        latitude: "26.17679",
        longitude: "-77.514389",
      },
    },
  ]);
}

export async function getFakeTasks(req: Request, res: Response) {
  res.header("Access-Control-Allow-Origin", "*");

  res.json([
    {
      name: "Meet with Laura",
      user: {
        picture: "https://randomuser.me/portraits/women/0.jpg",
      },
    },
    {
      name: "Polish brand idea",
      user: {
        picture: "https://randomuser.me/portraits/men/0.jpg",
      },
    },
    {
      name: "Copy/design feedback",
      user: {
        picture: "https://randomuser.me/portraits/women/1.jpg",
      },
    },
    {
      name: "Turn on notification on mobile Slack for user community",
      user: {
        picture: "https://randomuser.me/portraits/men/1.jpg",
      },
    },
    {
      name: "Connect with all of the investors that you met with recently",
      user: {
        picture: "https://randomuser.me/portraits/men/1.jpg",
      },
    },
  ]);
}

export async function getFakePlans(req: Request, res: Response) {
  res.header("Access-Control-Allow-Origin", "*");

  res.json([
    {
      description:
        "Perfect for the drinker who likes to enjoy 1-2 cups per day.",
      items: [
        "3 lbs of coffee per month",
        'Green or roasted beans"',
        'One or two varieties of beans"',
      ],
      plan: "Small",
      price: "50",
    },
    {
      description:
        "Great for avid drinkers, java-loving couples and bigger crowds",
      items: [
        "6 lbs of coffee per month",
        "Green or roasted beans",
        "Up to 4 different varieties of beans",
      ],
      plan: "Big",
      price: "80",
    },
    {
      description:
        "Want a few tiny batches from different varieties? Try our custom plan",
      items: [
        "Whatever you need",
        "Green or roasted beans",
        "Unlimited varieties",
      ],
      plan: "Custom",
      price: "??",
    },
  ]);
}

export async function getFakeBlurbs(req: Request, res: Response) {
  res.header("Access-Control-Allow-Origin", "*");

  res.json([
    {
      image:
        "https://gatsby-netlify-cms.netlify.app/static/277733984de58dd6d27eed18b510250d/1a97c/coffee.png",
      text:
        "We sell green and roasted coffee beans that are sourced directly from independent farmers and farm cooperatives. We’re proud to offer a variety of coffee beans grown with great care for the environment and local communities. Check our post or contact us directly for current availability.\n",
    },
    {
      image:
        "https://gatsby-netlify-cms.netlify.app/static/ec437153a2bd67b99cd975bf10c03292/1a97c/coffee-gear.png",
      text:
        "We offer a small, but carefully curated selection of brewing gear and tools for every taste and experience level. No matter if you roast your own beans or just bought your first french press, you’ll find a gadget to fall in love with in our shop.\n",
    },
    {
      image:
        "https://gatsby-netlify-cms.netlify.app/static/7de80b5f57f779d116b3a186b9a9268e/1a97c/tutorials.png",
      text:
        "Love a great cup of coffee, but never knew how to make one? Bought a fancy new Chemex but have no clue how to use it? Don't worry, we’re here to help. You can schedule a custom 1-on-1 consultation with our baristas to learn anything you want to know about coffee roasting and brewing. Email us or call the store for details.\n",
    },
    {
      image:
        "https://gatsby-netlify-cms.netlify.app/static/d2f97849ad334b9280651604a80a01a6/1a97c/meeting-space.png",
      text:
        "We believe that good coffee has the power to bring people together. That’s why we decided to turn a corner of our shop into a cozy meeting space where you can hang out with fellow coffee lovers and learn about coffee making techniques. All of the artwork on display there is for sale. The full price you pay goes to the artist.\n",
    },
  ]);
}

export async function getFakePosts(req: Request, res: Response) {
  res.header("Access-Control-Allow-Origin", "*");

  res.json([
    {
      templateKey: "blog-post",
      title: "A beginners’ guide to brewing with Chemex",
      date: "2017-01-04T15:04:10.000Z",
      featuredpost: false,
      featuredimage:
        "https://gatsby-netlify-cms.netlify.app/static/ad53658d229612b8d23d0307be253419/6e81a/chemex.jpg",
      description:
        "Brewing with a Chemex probably seems like a complicated, time-consuming ordeal, but once you get used to the process, it becomes a soothing ritual that's worth the effort every time.",
      tags: ["brewing", "chemex"],
    },
    {
      templateKey: "blog-post",
      title:
        "Just in: small batch of Jamaican Blue Mountain in store next week",
      date: "2017-01-04T15:04:10.000Z",
      featuredpost: true,
      description:
        "We’re proud to announce that we’ll be offering a small batch of Jamaica Blue Mountain coffee beans in our store next week.",
      tags: ["jamaica", "green beans", "flavor", "tasting"],
    },
    {
      templateKey: "blog-post",
      title: "Making sense of the SCAA’s new Flavor Wheel",
      date: "2016-12-17T15:04:10.000Z",
      featuredpost: false,
      featuredimage:
        "https://gatsby-netlify-cms.netlify.app/static/19a6d5ab24bbc3b3531f11ecab349683/6e81a/flavor_wheel.jpg",
      description:
        "The Coffee Taster’s Flavor Wheel, the official resource used by coffee tasters, has been revised for the first time this year.",
      tags: ["flavor", "tasting"],
    },
  ]);
}

export async function getFakeTestimonials(req: Request, res: Response) {
  res.header("Access-Control-Allow-Origin", "*");

  res.json([
    {
      author: "Elisabeth Kaurismäki",
      quote:
        "The first time I tried Kaldi’s coffee, I couldn’t even believe that was the same thing I’ve been drinking every morning.",
    },
    {
      author: "Philipp Trommler",
      quote:
        "Kaldi is the place to go if you want the best quality coffee. I love their stance on empowering farmers and transparency.",
    },
  ]);
}
