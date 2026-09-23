from rest_framework import serializers
from .models import (
    Project,
    Diagram,
    DiagramClass,
    Attribute,
    Relationship
)


class AttributeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Attribute

        fields = [
            'id',
            'name',
            'data_type',
            'length',
            'is_primary_key',
            'is_nullable',
            'is_unique',
            'default_value',
            'order'
        ]

    def validate(self, attrs):

        # Si estamos editando, self.instance contiene
        # el atributo que ya existe en PostgreSQL.
        instance = self.instance

        # Obtener la clase:
        # - POST: desde el contexto enviado por la vista.
        # - PATCH: desde el atributo existente.
        diagram_class = (
            instance.diagram_class
            if instance
            else self.context.get('diagram_class')
        )

        if diagram_class is None:
            raise serializers.ValidationError(
                'No se pudo identificar la clase del atributo.'
            )

        # Obtener los valores finales.
        # En PATCH, los campos no enviados conservan su valor actual.
        name = attrs.get(
            'name',
            instance.name if instance else ''
        )

        data_type = attrs.get(
            'data_type',
            instance.data_type if instance else None
        )

        length = attrs.get(
            'length',
            instance.length if instance else None
        )

        is_primary_key = attrs.get(
            'is_primary_key',
            instance.is_primary_key if instance else False
        )

        is_nullable = attrs.get(
            'is_nullable',
            instance.is_nullable if instance else True
        )

        is_unique = attrs.get(
            'is_unique',
            instance.is_unique if instance else False
        )

        # =====================================
        # 1. VALIDAR NOMBRE
        # =====================================

        if not name or not name.strip():
            raise serializers.ValidationError({
                'name': 'El nombre del atributo es obligatorio.'
            })

        name = name.strip()
        attrs['name'] = name

        if len(name) > 150:
            raise serializers.ValidationError({
                'name': 'El nombre no puede superar 150 caracteres.'
            })

        # =====================================
        # 2. EVITAR NOMBRES DUPLICADOS
        # =====================================

        existing_attributes = Attribute.objects.filter(
            diagram_class=diagram_class,
            name__iexact=name
        )

        # Si estamos editando, excluir el propio atributo.
        if instance:
            existing_attributes = existing_attributes.exclude(
                pk=instance.pk
            )

        if existing_attributes.exists():
            raise serializers.ValidationError({
                'name': 'Ya existe un atributo con ese nombre en esta clase.'
            })

        # =====================================
        # 3. VALIDAR CLAVE PRIMARIA
        # =====================================

        if is_primary_key:

            existing_primary_keys = Attribute.objects.filter(
                diagram_class=diagram_class,
                is_primary_key=True
            )

            # No contar el atributo que estamos editando.
            if instance:
                existing_primary_keys = existing_primary_keys.exclude(
                    pk=instance.pk
                )

            if existing_primary_keys.exists():
                raise serializers.ValidationError({
                    'is_primary_key': 'Esta clase ya tiene una clave primaria.'
                })

            # Una PK no puede permitir valores nulos.
            if is_nullable:
                raise serializers.ValidationError({
                    'is_nullable': 'Una clave primaria no puede permitir valores nulos.'
                })

            # Normalizar UNIQUE para la PK.
            if not is_unique:
                attrs['is_unique'] = True

        # =====================================
        # 4. VALIDAR LONGITUD
        # =====================================

        if data_type == 'VARCHAR':

            if (
                length is None
                or isinstance(length, bool)
                or not isinstance(length, int)
                or length <= 0
            ):
                raise serializers.ValidationError({
                    'length': 'VARCHAR necesita una longitud entera mayor que cero.'
                })

        else:
            # Evitar conservar una longitud de VARCHAR
            # cuando se cambia a otro tipo de dato.
            attrs['length'] = None

        return attrs


class DiagramClassSerializer(serializers.ModelSerializer):
    attributes = AttributeSerializer(many=True, read_only=True)

    class Meta:
        model = DiagramClass
        fields = [
            'id',
            'name',
            'position_x',
            'position_y',
            'attributes'
        ]


class RelationshipSerializer(serializers.ModelSerializer):
    source_class_name = serializers.CharField(
        source='source_class.name',
        read_only=True
    )

    target_class_name = serializers.CharField(
        source='target_class.name',
        read_only=True
    )

    class Meta:
        model = Relationship

        fields = [
            'id',
            'source_class',
            'source_class_name',
            'target_class',
            'target_class_name',
            'source_handle',
            'target_handle',
            'relationship_type',
            'name'
        ]

    def validate_source_handle(self, value):
        allowed = ['top', 'bottom', 'left', 'right']

        if value not in allowed:
            raise serializers.ValidationError(
                'Punto de conexión de origen no válido.'
            )

        return value

    def validate_target_handle(self, value):
        allowed = ['top', 'bottom', 'left', 'right']

        if value not in allowed:
            raise serializers.ValidationError(
                'Punto de conexión de destino no válido.'
            )

        return value

class DiagramSerializer(serializers.ModelSerializer):
    classes = DiagramClassSerializer(
        many=True,
        read_only=True
    )
    relationships = RelationshipSerializer(
        many=True,
        read_only=True
    )
    class Meta:
        model = Diagram
        fields = [
            'id',
             'name',
            'classes',
            'relationships',
            'created_at',
            'updated_at'
        ]