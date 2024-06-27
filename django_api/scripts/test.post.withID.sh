curl \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"id":8088, "annotation":{"stuff":123}, "annotator":1, "animal":"DK37", "label":"Fiducial"}' \
  http://localhost:8000/annotations/

