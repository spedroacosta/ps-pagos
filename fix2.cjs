const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(`    } catch (e) {
      console.log('Error in manual save:', e);
          setIsInitialized(true);
      } catch (e) {
        console.error("Error crítico al cargar datos:", e);
        alert("Error de red. Por favor, recarga la página.");
      } // removed finally block
      setTimeout(() => setIsSaving(false), 500);
    }`, `    } catch (e) {
      console.log('Error in manual save:', e);
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }`);
fs.writeFileSync('src/App.tsx', content);
