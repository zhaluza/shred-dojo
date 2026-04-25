import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("scale-positions", "routes/scale-positions.tsx"),
  route("lick-stash", "routes/lick-stash.tsx"),
  route("lick-stash/:packSlug", "routes/lick-stash-pack.tsx"),
  route("pentatonic-triads", "routes/pentatonic-triads.tsx"),
  route("pentatonic-colors", "routes/pentatonic-colors.tsx"),
  route("interval-shapes", "routes/interval-shapes.tsx"),
  route("shape-explorer", "routes/shape-explorer.tsx"),
  route("chord-voicings", "routes/chord-voicings.tsx"),
  route("arpeggio-maps", "routes/arpeggio-maps.tsx"),
  route("wylde-scales", "routes/wylde-scales.tsx"),
] satisfies RouteConfig;
