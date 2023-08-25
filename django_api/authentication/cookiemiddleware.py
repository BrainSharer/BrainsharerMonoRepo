from authentication.services import jwt_login


class CookieMiddleware:
    """This class makes sure there is an access cookie present set at login.
    It also gets deleted at logout. This cookie is used by Neuroglancer and the angular
    front end for authentication.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # One-time configuration and initialization.

    def __call__(self, request):
        """The first if statement is for when people login with username and password.
        In this case, there is no cookie so we set it there.
        The 2nd if statement is when they logout so we delete the cookie.
        """

        response = self.get_response(request)

        if request.user.is_authenticated and not request.COOKIES.get('access'):
            print('\tUser is authenticated but NO access cookie')
            response = jwt_login(response=response, user=request.user, request=request)
        elif not request.user.is_authenticated and request.COOKIES.get('access'):
            print(f"\tUser is NOT authenticated so deleting cookies!!!")
            response.delete_cookie("access")
            response.delete_cookie("refresh")
            response.delete_cookie("id")
            response.delete_cookie("username")



        return response