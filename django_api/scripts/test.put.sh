#https://www.brainsharer.org/brainsharer/annotations/

curl \
  -X PUT \
  -H "Content-Type: application/json" \
  -d '{"animal" : "DK37", "annotation" : {"type": "volume", "props": ["#ffff00", 999, 1, 5, 3]}, "annotator" : 1, "id" : "", "label" : "IC\n10N_L"}' \
http://localhost:8000/annotations/api/8095

