let estado = false
let boton = document.getElementById('icono-menu')
let nav = document.getElementById('nav-contenedor')

boton.addEventListener('click', function(){
    if(estado == false){
        nav.classList.add('mostrar')
        estado = true
    }else if(estado == true){
        nav.classList.remove('mostrar')
        estado = false
    }
})
