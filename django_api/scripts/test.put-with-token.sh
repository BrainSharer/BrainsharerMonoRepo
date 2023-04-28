#curl \
#  -X POST \
#  -H "Content-Type: application/json" \
#  -d '{"refresh":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX3BrIjoxLCJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImNvbGRfc3R1ZmYiOiLimIMiLCJleHAiOjIzNDU2NywianRpIjoiZGUxMmY0ZTY3MDY4NDI3ODg5ZjE1YWMyNzcwZGEwNTEifQ.aEoAYkSJjoWH1boshQAaTkf8G3yn0kapko6HFRt7Rh4"}' \
#  http://localhost:8000/api/token/refresh/


curl \
-X PUT \
-H "Content-Type: application/json" \
-H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNjgwMjQ2OTkwLCJpYXQiOjE2Nzk4ODY5OTAsImp0aSI6Ijg0YmE1MzEzZjgxZTRiNjY4ODM2ZGMyODRlYWRhYTg0IiwidXNlcl9pZCI6NzJ9.AGRLOBqyxIQ3su6QED-8vwmkFg5TN18Iq3ekCvTWqHk" \
-d '{
    "neuroglancer_state": '{}',
    "user_date":"123", 
    "comments":"update 6 for ID=21", 
    "owner":"7"}' \
http://localhost:8000/neuroglancer/21
