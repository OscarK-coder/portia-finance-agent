import type { Subscription } from "@/lib/api";

export const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: "sub1",
    plan: "Netflix",
    status: "active",
    renews_on: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    logo: "https://images.ctfassets.net/4cd45et68cgf/Rx83JoRDMkYNlMC9MKzcB/2b14d5a59fc3937afd3f03191e19502d/Netflix-Symbol.png?w=700&h=456",
    logoFallback: "N",
  },
  {
    id: "sub2",
    plan: "Spotify",
    status: "active",
    renews_on: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    logo: "https://m.media-amazon.com/images/I/51rttY7a+9L._h1_.png",
    logoFallback: "S",
  },
  {
    id: "sub3",
    plan: "Amazon Prime",
    status: "active",
    renews_on: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    logo: "https://m.media-amazon.com/images/I/31W9hs7w0JL.png",
    logoFallback: "A",
  },
  {
    id: "sub4",
    plan: "ChatGPT Plus",
    status: "active",
    renews_on: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
    logoFallback: "C",
  },
  {
    id: "sub5",
    plan: "Apple Music",
    status: "active",
    renews_on: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    logo: "https://play-lh.googleusercontent.com/mOkjjo5Rzcpk7BsHrsLWnqVadUK1FlLd2-UlQvYkLL4E9A0LpyODNIQinXPfUMjUrbE=w240-h480-rw",
    logoFallback: "A",
  },
];
