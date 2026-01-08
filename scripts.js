document.addEventListener('DOMContentLoaded', function(){
    // 1) Dynamic year in footer
    try{
        var yearEl = document.getElementById('year');
        if(yearEl) yearEl.textContent = new Date().getFullYear();
    }catch(e){ /* ignore */ }

    // 2) Smooth scroll with header offset and temporary highlight glow on target
    (function(){
        var headerEl = document.querySelector('header');
        function onInternalLinkClick(e){
            var link = e.currentTarget;
            var href = link.getAttribute('href');
            if(!href || href.charAt(0) !== '#') return;
            var id = href.slice(1);
            if(!id) return; // ignore href="#" or empty
            var target = document.getElementById(id);
            if(!target) return; // no target found

            e.preventDefault();

            var headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
            var extraGap = 8; // visual gap between header and target
            var targetTop = window.scrollY + target.getBoundingClientRect().top - headerHeight - extraGap;

            // perform smooth scroll to computed position
            var start = window.scrollY;
            var distance = Math.abs(targetTop - start);
            var duration = Math.min(1200, Math.max(350, Math.round(distance * 0.6)));
            window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });

            // add glow shortly after scroll starts; delay approx equals duration
            setTimeout(function(){
                // Add class to highlight the element (will auto-fade via CSS animation)
                target.classList.add('highlight-glow');
                // Remove class after 3s (match animation length)
                setTimeout(function(){ target.classList.remove('highlight-glow'); }, 3000);
            }, duration + 60);

            // Also update the hash in the address bar without jumping
            if (history && typeof history.pushState === 'function') {
                try { history.pushState(null, '', '#' + id); } catch(e){ /* ignore */ }
            }
        }

        // Attach listener to same-page anchor links only (cache selectors for perf)
        var anchors = document.querySelectorAll('a[href^="#"]');
        anchors.forEach(function(a){
            var href = a.getAttribute('href');
            if(!href || href === '#' ) return;
            // If the link has target or external behavior, skip
            if(a.hasAttribute('target') && a.getAttribute('target') !== '_self') return;
            a.addEventListener('click', onInternalLinkClick);
        });
    })();

    // 5) Terms of Service confirmation modal: show on register click, require checkbox, open link
    (function(){
        // find any element that carries a data-tos-link attribute
        var tosTriggers = document.querySelectorAll('[data-tos-link]');
        if(!tosTriggers || tosTriggers.length === 0) return;

        var overlay = document.getElementById('tosOverlay');
        if(!overlay) return;
        var closeBtn = overlay.querySelector('.tos-close');
        var cancelBtn = overlay.querySelector('.tos-cancel');
        var confirmBtn = overlay.querySelector('#tosConfirm');
        var agreeCheckbox = overlay.querySelector('#tosAgree');

        function openModal(link){
            overlay.hidden = false;
            overlay.setAttribute('aria-hidden','false');
            // prevent background scroll
            document.body.style.overflow = 'hidden';
            // store link to open on confirm
            overlay._targetLink = link;
            // reset checkbox and confirm button
            try{ if(agreeCheckbox) agreeCheckbox.checked = false; }catch(e){}
            try{ if(confirmBtn) confirmBtn.disabled = true; }catch(e){}
            // remember focus for restoration
            try{ overlay._previousFocus = document.activeElement; }catch(e){}
            // focus the checkbox for accessibility
            setTimeout(function(){ try{ if(agreeCheckbox) agreeCheckbox.focus(); }catch(e){} }, 80);
        }

        function closeModal(){
            try{ overlay.hidden = true; overlay.setAttribute('aria-hidden','true'); }catch(e){}
            document.body.style.overflow = '';
            overlay._targetLink = null;
            // restore focus
            try{ if(overlay._previousFocus && typeof overlay._previousFocus.focus === 'function') overlay._previousFocus.focus(); }catch(e){}
        }

        tosTriggers.forEach(function(t){
            t.addEventListener('click', function(e){
                e.preventDefault();
                var link = t.getAttribute('data-tos-link') || t.dataset.tosLink || null;
                openModal(link);
            });
        });

        if(closeBtn) closeBtn.addEventListener('click', closeModal);
        if(cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // click outside modal closes
        overlay.addEventListener('click', function(e){ if(e.target === overlay) closeModal(); });

        // ESC closes
        window.addEventListener('keydown', function(e){ if(e.key === 'Escape' && overlay && !overlay.hidden) closeModal(); });

        if(agreeCheckbox){
            agreeCheckbox.addEventListener('change', function(){ if(confirmBtn) confirmBtn.disabled = !agreeCheckbox.checked; });
        }

        if(confirmBtn){
            confirmBtn.addEventListener('click', function(e){
                if(confirmBtn.disabled) return;
                var link = overlay && overlay._targetLink ? overlay._targetLink : null;
                closeModal();
                if(link){ try{ window.open(link, '_blank', 'noopener'); }catch(e){ window.location.href = link; } }
            });
        }
    })();

    // 3) Video modal: open/close, blur/dim background and lock scroll
    (function(){
        var trigger = document.getElementById('watch-video');
        if(!trigger) return;

        function createOverlay(videoUrl){
            // overlay
            var overlay = document.createElement('div');
            overlay.className = 'video-overlay';
            overlay.tabIndex = -1;

            // popup container
            var popup = document.createElement('div');
            popup.className = 'video-popup';

            // close button
            var closeBtn = document.createElement('button');
            closeBtn.className = 'video-close';
            closeBtn.setAttribute('aria-label','Uždaryti vaizdo įrašą');
            closeBtn.innerHTML = '✕';

            // iframe for video - append params safely if needed
            var iframe = document.createElement('iframe');
            var src = videoUrl + (videoUrl.indexOf('?') === -1 ? '?rel=0&autoplay=1' : '&rel=0&autoplay=1');
            iframe.setAttribute('src', src);
            iframe.setAttribute('title', 'Vaizdo įrašas - SK Faiteris');
            iframe.setAttribute('frameborder','0');
            iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
            iframe.setAttribute('allowfullscreen','');

            popup.appendChild(closeBtn);
            popup.appendChild(iframe);
            overlay.appendChild(popup);

            // close handlers
            function close(){
                try{
                    // stop playback quickly by clearing src
                    if(iframe && iframe.src) iframe.src = '';
                }catch(e){/* ignore */}
                // remove overlay
                if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                document.body.style.overflow = ''; // restore scroll
                window.removeEventListener('keydown', onKey);
                // restore prior focus
                try{ if(overlay._previousFocus && typeof overlay._previousFocus.focus === 'function') overlay._previousFocus.focus(); }catch(e){/* ignore */}
            }

            closeBtn.addEventListener('click', close);

            // click outside popup closes
            overlay.addEventListener('click', function(e){
                if(e.target === overlay) close();
            });

            function onKey(e){
                if(e.key === 'Escape') close();
            }
            window.addEventListener('keydown', onKey);

            // expose some internals for focus management
            overlay._closeBtn = closeBtn;

            return { overlay: overlay, close: close, closeBtn: closeBtn };
        }

        trigger.addEventListener('click', function(e){
            e.preventDefault();
            var videoUrl = trigger.dataset.video || '';
            if(!videoUrl) return;

            var created = createOverlay(videoUrl);
            // remember what had focus and restore it later
            created.overlay._previousFocus = document.activeElement;
            document.body.appendChild(created.overlay);
            // prevent background scrolling
            document.body.style.overflow = 'hidden';
            // focus the close button for accessibility
            try{ created.closeBtn.focus(); }catch(e){ created.overlay.focus(); }
        });
    })();

    // 4) Hide header when scrolling down past its natural position; show when scrolling up
    (function(){
        var prevScrollpos = window.pageYOffset || 0;
        var headerDiv = document.querySelector('header');
        if(!headerDiv) return;

        function updateMeasurements(){
            var headerHeight = headerDiv.offsetHeight || 0;
            headerDiv._height = headerHeight;
            headerDiv._bottom = headerHeight;
            var main = document.querySelector('main');
            if(main) main.style.marginTop = headerHeight + 'px';
        }

        updateMeasurements();
        window.addEventListener('resize', updateMeasurements);

        // Throttle scroll handler using requestAnimationFrame to reduce layout thrashing
        var ticking = false;
        window.addEventListener('scroll', function(){
            if (!ticking) {
                window.requestAnimationFrame(function(){
                    var currentScrollPos = window.pageYOffset || 0;
                    var headerBottom = headerDiv._bottom || headerDiv.offsetHeight;

                    if (prevScrollpos > currentScrollPos || currentScrollPos < headerBottom){
                        // scrolling up OR haven't passed header -> show
                        headerDiv.style.top = '0';
                    } else {
                        // scrolling down and passed header -> hide
                        headerDiv.style.top = '-' + (headerDiv._height || headerDiv.offsetHeight) + 'px';
                    }

                    prevScrollpos = currentScrollPos;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    })();

});
