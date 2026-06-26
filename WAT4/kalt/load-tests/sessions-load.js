import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:7070";

export const options = {
  stages: [
    { duration: "15s", target: 20 },
    { duration: "30s", target: 20 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/sessions`);
  check(res, {
    "status 200": (r) => r.status === 200,
    "body ist Array": (r) => Array.isArray(r.json()),
  });
}
