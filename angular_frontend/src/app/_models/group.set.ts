
/* This overrides the set so you can actually compare objects.
It uses the JSON.stringify method to get the objects in a common
object type
*/
export class GroupSet<T> extends Set<T> {
    override add(value: T): this {
        let found = false;
        this.forEach(item => {
            if (JSON.stringify(value) === JSON.stringify(item)) {
                found = true;
            }
        });
        if (!found) {
            super.add(value);
        }
        return this;
    }
  }