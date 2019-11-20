# man  SCSS


## MAP

Tipo de dato consistente en colección de pares clave/valor

```scss
// Generación de un mapa
$mapa:{
  key1: valor1,
  key2: valor2
};

// Obtener valores del mapa:
<selector>{
  width: map-get($mapa, key1);    //valor1
}

//Con control de errores
<selector>{
  @if map-has-key($mapa, key1){
    width: map-get($mapa, key1); //valor1
  } @else{
    width: 100%;                 //100%
  }
}

//Fusionar mapas
$colores--pepe:(
  light: #ccc,
  dark: #000
);

$colores--javi: (
  main: red,
  alt: blue
)

$colores: map-merge($colores--pepe, $colores--javi);

<selector>{
  color: map-get($colores, main); //red
}

```

### Generar clases recorriendo un mapa

Con la creación de un mapa, podemos generar rápidamente clases complejas como el responsive o la de icons.

#### Creación clases para los iconos
```scss
/* Crear clases para los iconos */
$rbl-icons: (
  tipo1: valor1,
  tipo2: valor2,
);

@each $tipo, $valor in $rbl-icons{
  .rbl-icon--#{$tipo} {
    content: $valor;
  }
}

```
#### Creación clases para los botones

```scss

$rbl-buttons-types: ('error', 'sucess', 'warning');

$rbl-buttons: (
  error: (#d82d2d, #666),
  success: (#52bf4a, #fff),
  warning: (#c23435, #fff)
);

.rbl-button{
  display: inline-block;
  @each $tipo, $colores in $rbl-buttons{
    $bgcolor: nth($colores, 1);
    $fontcolor: nth($colores, 2);

    &--#{tipo}{
      background-color: $bgcolor;
      color: $fontcolor;
    }
  }
}

```



