from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )

    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'password',
            'password_confirm'
        ]
        read_only_fields = ['id']

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                'Este nombre de usuario ya está registrado.'
            )

        return value

    def validate_email(self, value):
        email = value.strip().lower()

        if not email:
            raise serializers.ValidationError(
                'El correo electrónico es obligatorio.'
            )

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                'Este correo electrónico ya está registrado.'
            )

        return email

    def validate(self, attrs):

        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Las contraseñas no coinciden.'
            })

        user = User(
            username=attrs['username'],
            email=attrs['email']
        )

        try:
            validate_password(attrs['password'], user=user)
        except ValidationError as error:
            raise serializers.ValidationError({
                'password': error.messages
            })

        return attrs

    def create(self, validated_data):

        validated_data.pop('password_confirm')

        return User.objects.create_user(
            **validated_data
        )
        
        
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)

        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
        }

        return data