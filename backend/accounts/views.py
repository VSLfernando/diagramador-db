from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer, CustomTokenObtainPairSerializer


class RegisterView(APIView):

    # Permitir registrarse sin haber iniciado sesión.
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):

        serializer = RegisterSerializer(data=request.data)

        # Validar usuario, correo y contraseñas.
        serializer.is_valid(raise_exception=True)

        # Guardar el usuario en PostgreSQL.
        user = serializer.save()

        return Response(
            {
                'message': 'Usuario registrado correctamente.',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                }
            },
            status=status.HTTP_201_CREATED
        )
        
        
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer