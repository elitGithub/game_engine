TASK: Refactor the project into a proper Nx monorepo structure.  
STATUS: PENDING  
Explanation:

* This is a larger structural change to be done AFTER test coverage is complete.  
* Create a 'packages/' directory.  
* Move the current 'engine/' code into 'packages/engine/src/'.  
* Move 'engine/plugins/' into 'packages/plugins/'.  
* Create a 'packages/example-game/' directory to build a simple game that *uses* the engine, proving the 'plug-and-develop' concept.  
* This will properly leverage the Nx configuration files.