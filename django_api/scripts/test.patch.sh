curl \
  -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"id":8090, "annotation": {"junk":666} }' \
  http://localhost:8000/annotations/

