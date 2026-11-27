# Guardar la contraseña de Jaqui para que Claude pruebe la app (2026-11-27)

La contraseña **no se escribe en el chat**. Va a un archivo de la compu que solo vos y Claude pueden leer
(`~/.config/omni/secretos/`, el mismo lugar de las otras claves del Omni). Claude la usa sin mostrarla.

1. Abrí la terminal de **Ubuntu** (la de Linux, no el chat de Claude).
2. Pegá este comando y tocá **Enter**:

```bash
read -rs -p "Contraseña de jaqui@: " C && printf 'TABERNA_ADMIN_EMAIL=jaqui@lataberna.com\nTABERNA_ADMIN_CLAVE=%s\n' "$C" > ~/.config/omni/secretos/taberna-admin.env && chmod 600 ~/.config/omni/secretos/taberna-admin.env && unset C && echo GUARDADA
```

3. Escribí la contraseña de Jaqui (**no se ve mientras escribís**, es normal) y tocá **Enter**.
4. Tiene que decir **GUARDADA**. Escribile a Claude **"listo"**.

Para borrarla cuando quieras: `rm ~/.config/omni/secretos/taberna-admin.env`
