public class Persona {
    private String nombre;
    private int edad;
    private String email;
    
    // Constructor por defecto
    public Persona() {
    }
    
    // Constructor con parámetros
    public Persona(String nombre, int edad, String email) {
        this.nombre = nombre;
        this.edad = edad;
        this.email = email;
    }
    
    // Getters y Setters
    public String getNombre() {
        return nombre;
    }
    
    public void setNombre(String nombre) {
        this.nombre = nombre;
    }
    
    public int getEdad() {
        return edad;
    }
    
    public void setEdad(int edad) {
        this.edad = edad;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    // Método toString
    @Override
    public String toString() {
        return "Persona{" +
               "nombre='" + nombre + '\'' +
               ", edad=" + edad +
               ", email='" + email + '\'' +
               '}';
    }
    
    // Método main
    public static void main(String[] args) {
        // Crear objeto persona usando constructor con parámetros
        Persona persona1 = new Persona("Juan Pérez", 25, "juan@email.com");
        
        // Crear objeto persona usando constructor vacío y setters
        Persona persona2 = new Persona();
        persona2.setNombre("María García");
        persona2.setEdad(30);
        persona2.setEmail("maria@email.com");
        
        // Mostrar información de las personas
        System.out.println("Persona 1: " + persona1.toString());
        System.out.println("Persona 2: " + persona2);
        
        // Probar getters
        System.out.println("Nombre de persona1: " + persona1.getNombre());
        System.out.println("Edad de persona2: " + persona2.getEdad());
    }
}