curl \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"annotation":{"stuff":123}, "annotator":1, "animal":"DK37", "label":1}' \
  http://localhost:8000/annotations/
