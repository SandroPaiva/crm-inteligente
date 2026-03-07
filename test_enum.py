import enum
class PapelUsuario(str, enum.Enum):
    admin = "admin"

val = "admin"
print(val == PapelUsuario.admin)
