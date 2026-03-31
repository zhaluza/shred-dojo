import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("scale-positions", "routes/scale-positions.tsx"),
] satisfies RouteConfig;
