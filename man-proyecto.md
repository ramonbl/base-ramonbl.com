# Proyecto

`dist` (`public`) con los archivos para producción
`src` (`dev`) con los archivos para desarrollo
> `pug` para los archivos pug
>> `includes` no querremos compilarlo (pero nocesitamos incluirlo)
>> `pages` necesario compilarlo

## compilando con `pug`
```bash
cd E:\laragon\www\ramonbl\man-scss-pug\02-proyecto>

pug -wP src/pug/pages -o dist -p src/pug/includes
```
## compilando con prepros
Usamos programa prepros (lo haremos en este proyecto)

