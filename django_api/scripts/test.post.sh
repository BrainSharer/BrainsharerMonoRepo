#https://www.brainsharer.org/brainsharer/annotations/

curl \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"animal" : "DK37", "annotation" : {"type": "volume", "props": ["#ffff00", 666, 1, 5, 3]}, "annotator" : 1, "id" : "", "label" : "SC"}' \
http://localhost:8000/annotations/api/

