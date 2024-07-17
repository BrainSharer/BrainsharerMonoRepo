#https://www.brainsharer.org/brainsharer/annotations/

curl \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"animal" : "DK41", "annotation" : {"source": [1,2,3]}, "annotator" : 38, "id" : "", "label" : "Round3_Unsure_2000\nHUMAN_NEGATIVE"}' \
http://localhost:8000/annotations/

