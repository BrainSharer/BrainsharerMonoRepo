#### High level overview of UI Annotation Module
- The `annotations.ts` module in `neuroglancer/ui` directory supports multiple operations for annotations across neuroglancer for drawing UI elements. Currently neuroglancer supports the below annotations:
  - Cell
  - Point
  - COM (Centre of Mass)
  - Polygon
  - Volume
- The `annotations.ts` module supports the below common functionality for all annotations:
   - Draw annotations using `Tool` class, each annotation has a separate tool class which inherits the base class `Tool`. For eg: `PlacePolygonTool` is the class used to draw polygons.
   - Fetch the list of landmarks (for Volume) and categories (for Cell) used for labeling various annotations.
   - Maintain all the annotations in a particular layer by storing them in a map with key as annotation id and value as annotation. Class `AnnotationLayerView` is used to implement this.
   - Includes utility functions/enums which are used by different annotation tools. For eg: we have an enum `PolygonToolMode` which takes values: `DRAW`, `EDIT` and `VIEW` indicating different modes in which the tool operates.