import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("scale-positions", "routes/scale-positions.tsx"),
  route("lick-stash", "routes/lick-stash.tsx"),
  route("lick-stash/:packSlug", "routes/lick-stash-pack.tsx"),
  route("pentatonic-triads", "routes/pentatonic-triads.tsx"),
  route("interval-shapes", "routes/interval-shapes.tsx"),
] satisfies RouteConfig;
