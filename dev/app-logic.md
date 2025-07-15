There now needs to be 16 distinct calculations:

#1 for horizontal straight pulls (left to right, right to left 
#2 for vertical straight pulls( top to bottom, or bottom to top) 
#3 for all angle pulls which enter or exit the left side combined with any u-pulls that enter and exit the left side 
#4 for all angle pulls which enter or exit the right side combined with any u-pulls that enter and exit the right side 
#5 for all angle pulls which enter or exit the top side combined with any u-pulls that enter and exit the top side 
#6 for all angle pulls which enter or exit the bottom side combined with any u-pulls that enter and exit the bottom side 
#7 for wire bending space for all angle or u-pulls entering or exiting the rear side
#8 for total height space required to accommodate all conduits currently on the left wall of the box based on the lockringODspace of each conduit added together
#9 for total height space required to accommodate all conduits currently on the right wall of the box based on the lockringODspace of each conduit added together
#10 for total width space required to accommodate all conduits currently on the top wall of the box based on the lockringODspace of each conduit added together
#11 for total width space required to accommodate all conduits currently on the bottom wall of the box based on the lockringODspace of each conduit added together
#12 for total width space required to accommodate all conduits currently entering or exiting the rear wall whose corresponding entry or exit are on the left or right wall based on the lockringODspace of each conduit added together
#13 for total height space required to accommodate all conduits currently entering or exiting the rear wall whose corresponding entry or exit are on the top or bottom wall based on the lockringODspace of each conduit added together
#14 for total depth space required to accommodate the largest conduits entering the left, right, top, and bottom sides
#15 for total height space required to allow for “minimum required pull distance”
#16 for total width space required to allow for “minimum require pull distance”

 
Sequence:
First calculate straight pulls. Step 1: Calculate #1 using the the following logic. Whatever is the largest horizontal straight pull conduit size, take that size and multiply by 8. Be sure that this is only looking at left/right and right/left pull and ignores ALL others. So if their are three horizontal straight pulls, 1", 3", 3", the largest is 3" so our calculation is 8x3 = 24 in. Store this as "minimum horizontal straight pull calc" and print this calc in the debug window

Step 2: Calculate #2 using the the following logic. Whatever is the largest vertical straight pull conduit size, take that size and multiply by 8. Be sure that this is only looking at top/bottom and bottom/top pull and ignores ALL others. So if their are three vertical straight pulls, 2",2", 3", the largest is 3" so our calculation is 8x3 = 24 in. Store this as "minimum vertical straight pull calc" and print this calc in the debug window

Step 3:Calculate #3 using the the following logic. list all angle or u-pulls entering or exiting the left wall. this includes angles pulls: left/top, left/bottom, left/rear, top/left, bottom/left, rear/left; and u-pulls left/left, and be sure ignore all other pull when doing this calculation. First identify the largest size of all the angle pulls and u-pull combined. For example let's use the following example:
Pull1: left to right 1" (ignored, not an angle or u-pull) Pull2: top to bottom 1" (ignored, not on left wall) Pull 3: left to bottom 1" (added to calc - angle pull) pull 4: left to left 3" (added to calc - u-pull) Pull 5: left to rear 3" (added to calc - angle pull) Pull6: right to bottom 4" (ignored, not on left wall) Pull 7: left to left 1" (added to calc - u-pull)
So now we have a list of the relevant pull: 3,4, 5, & 7. To identify the largest we list them all and determine the largest size. In this case pulls 4 &5 are both 3" which is the largest size. So since they are tied we'll just pick #4 as the largest since the pull number comes first. so now we have established our largest pull: #4. So now we can adjust our list to:
largest pull - #4 (half u-pull) additional pulls: #3, 5(half u-pull) 5, & 7
Since the largest pull is a u-pull which enters AND exits the left side we need to account for it once as the largest conduit, and once as an additional conduit. Now we can finally do our calculation. 6 x largest conduit + all other conduits.
In this case that would look like:
(6 x 3) + 3 + 1 + 3 + 1 +1 = 18 + 9 + 27
Why are there five "additional conduits" in the calc? because u-pulls both enter and exit the left side they need to be counted twice. Pull #7 is added twice with the final two "1"'s and pull #4 is counted once as the largest conduit (6x3) and once as an additional conduit. Store this as "minimum left side angle/u-pull calc" and print this calc in the debug window.

Step 4: calculate #4 using the same logic as #3 but for the right wall. This includes angle pulls: right/top, right/bottom, right/rear, top/right, bottom/right, rear/right; and U-pulls right/right. Store this as "minimum right side angle/u-pull calc" and print this calc in the debug window.

Step 5: calculate #5 using the same logic as #3 but for the top wall. This includes angle pulls: top/right, top/left, left/top, right/top, top/rear, rear/top; and U-pulls top/top. Store this as "minimum top side angle/u-pull calc" and print this calc in the debug window.

Step 6: calculate #6 using the same logic as #3 but for the bottom wall. This includes angle pulls: bottom/right, bottom/left, left/bottom, right/bottom, bottom/rear, rear/bottom; and U-pulls bottom/bottom. Store this as "minimum bottom side angle/u-pull calc" and print this calc in the debug window.

Step 7: Calculate #7 using the the following logic. list all angle or u-pulls entering or exiting the rear wall. this includes angles pulls: left/rear, right/rear, top/rear, bottom/rear, rear/left, rear/right, rear/top, rear/bottom; and u-pulls rear/rear, and be sure ignore all other pull when doing this calculation. For all of these pulls we will list the max conductor size for each and find the largest conductor size. The largest conductor size needs to be converted to a minimum pull box depth based on the following:
16AWG through 6AWG = 1.5" 4AWG through 3AWG = 2" 2AWG = 2.5" 1AWG = 3" 1/0 through 2/0 = 3.5" 3/0 through 4/0 = 4" 250 = 4.5" 300 through 350 = 5" 400 through 500 = 6" 600 through 900 = 8" 1000 through 1250 = 10" 1500 through 2000 = 12"
Store this as "rear angle pull minimum depth" and print this calc in the debug window.

Step 8: calculate #8 using the following logic.  List all conduits conduits currently entering or exiting on the left wall of the box.  Find the lockringODspace of each of these conduits.  Add these all together and store them as “left wall minimum lockring height”

Step 9: calculate #9 using the following logic.  List all conduits conduits currently entering or exiting on the right wall of the box.  Find the lockringODspace of each of these conduits.  Add these all together and store them as “right wall minimum lockring height”

Step 10: calculate #10 using the following logic.  List all conduits conduits currently entering or exiting on the top wall of the box.  Find the lockringODspace of each of these conduits.  Add these all together and store them as “top wall minimum lockring width”

Step 11: calculate #11 using the following logic.  List all conduits conduits currently entering or exiting on the bottom wall of the box.  Find the lockringODspace of each of these conduits.  Add these all together and store them as “bottom wall minimum lockring width”

Step 12: calculate #12 using the following logic.  List all conduits currently entering or exiting the rear wall whose corresponding entry or exit are on the left or right wall.  Find the lockringODspace of each of these conduits.  Add these all together and store them as “rear wall minimum lockring width”

Step 13: calculate #13 using the following logic.  List all conduits currently entering or exiting the rear wall whose corresponding entry or exit are on the top or bottom wall.  Find the lockringODspace of each of these conduits.  Add these all together and store them as “rear wall minimum lockring height”

Step 14: calculate #14 using the following logic: List all conduits conduits currently entering or exiting on the left, top, right, and bottom of the box.  Find the lockringODspace of each of these conduits.  Determine the largest conduit size present.  The largest will be stored as “minimum lockring depth”

Step 15: Calculate #15 by using the following logic:  Sum conduitSize * 6 + locknutODSpacing (entry) + locknutODSpacing (exit) for left/left, right/right, rear/top, rear/bottom, top/rear, bottom/rear pulls, grouped by wall (left, right, rear). Print all results.  The largest will be stored as “minimum pull distance height”.  

Step 16: Calculate #16 by using the following logic:  Sum conduitSize * 6 + locknutODSpacing (entry) + locknutODSpacing (exit) for top/top, bottom/bottom, rear/rear, rear/left, rear/right, left/rear, right/rear pulls, grouped by wall (top, bottom, rear).Print all results.  The largest will be stored as “minimum pull distance width”.

Step 17: Calculate #17 by using the following logic for parallel U-pull spacing affecting width: For each wall (top, bottom, rear), identify all U-pulls on that wall (top/top, bottom/bottom, rear/rear). If there are multiple U-pulls on the same wall, sum all lockringODSpacing values for those conduits and subtract the largest lockringODSpacing value (since the largest is already accounted for in the main calculation). This gives the additional spacing needed between parallel U-pulls. Take the maximum result across all walls. Store this as "parallel U-pull spacing width".

Step 18: Calculate #18 by using the following logic for parallel U-pull spacing affecting height: For each wall (left, right), identify all U-pulls on that wall (left/left, right/right). If there are multiple U-pulls on the same wall, sum all lockringODSpacing values for those conduits and subtract the largest lockringODSpacing value (since the largest is already accounted for in the main calculation). This gives the additional spacing needed between parallel U-pulls. Take the maximum result across all walls. Store this as "parallel U-pull spacing height".

Step 19: Calculate #19 by using the following logic for rear/rear U-pull height: For all rear/rear U-pulls, sum the lockringODSpacing values for each conduit. This accounts for the vertical spacing required when multiple rear/rear U-pulls are present, as each conduit entry/exit requires its own locknut spacing on the rear wall. Store this as "rear/rear U-pull height".

Step 20: Establish minimum pull can width by comparing the results of steps #1, 3, 4, 9, 10, 11, 12, 16, 17. Print all results in debug window and identify which is the largest. The largest will be stored as "minimum pull can width"

Step 21: Establish minimum pull can height by comparing the results of steps #2, 5, 6, 7, 8, 13, 15, 18, 19. Print all results in debug window and identify which is the largest. The largest will be stored as "minimum pull can height"

Step 22: Establish a minimum pull can depth by comparing the results of steps #7 & 14.  Print all results in debug window and identify which is the largest.  Store this as "minimum pull can depth" and print this calc in the debug window.

Step 23: List the final result based on current pulls based on the "minimum pull can width" X "minimum pull can height" X "minimum pull can depth"


