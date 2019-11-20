# Prism.js

Librería para insertar código en la web.


[Web de Prism](https://prismjs.com/index.html)
1. Descargamos los archivos en: `src/libraries/prism` para tenerlos en todos los proyectos
2. COPIAMOS LOS CONTENIDOS A:
   
   El CSS en: `src/scss/web-styles/libraries/prism/_prism.scss` q incluiremos en nuestro `src/scss/styles.scss` (parseado a `dist/css/styles.css`)
   El JS en `src/js/prism/prism.js` que parsearemos a `dist/js/prism/prism.js`

EJEMPLO De uso

```html
  <pre rel='CSS' class="line-numbers" data-start="3"><code class="language-css">
     
     <!-- contenido CSS -->
     }
  </code></pre>
```


## Plugins

### Line-numbers

Permite añadir los números a las líneas.
Usar la `<pre class="line-numbers">` o en un antecesor para que lo aplique en toda la descendencia

#### Atributos `pre` (o antecesores)
- `class="line-numbers"` genera las líneas
- `data-start` empieza o acaba conteo


