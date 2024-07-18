#https://www.brainsharer.org/brainsharer/annotations/

curl \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"animal" : "MD585", "annotation" : {"source": [1,2,3]}, "annotator" : 1, "id" : "", "label" : "SC\nIC"}' \
http://localhost:8000/annotations/new/

