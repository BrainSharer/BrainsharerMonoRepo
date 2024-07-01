#https://www.brainsharer.org/brainsharer/annotations/

curl \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"animal" : "MD589", "annotation" : {"source": [1,2,3]}, "annotator" : 1, "id" : "7755", "label" : "Fiducial"}' \
http://localhost:8000/annotations/

